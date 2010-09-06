#!/usr/bin/env ruby

require 'rubygems'
require 'nokogiri'
require 'json'

doc = Nokogiri::HTML(open('weekdaytimetable.html'))

# NORTHBOUND
northbound = doc/'//table[@summary="Weekday Northbound service"]'

train_numbers = northbound/'tbody/tr[1]/th/text()'
train_numbers = train_numbers.map(&:to_s).find_all{|n| n =~ /\d\d\d/}

stations = (northbound/"tbody/tr/th[2]/a").map(&:text).map{|t| t.gsub(/\302\240/,' ')}

trains = {}

3.upto(train_numbers.length+2) do |column|
  cell_index = column
  cell_index += 1 if column >= 27
  times = []
  cells = northbound/"tbody/tr/td[#{cell_index}]"
  cells.each_with_index do |cell, index|
    txt = cell.text.delete("\r\n\302\240 -")
    unless txt.empty?
      if (cell/"strong").length > 0
        time = txt.split(":").map(&:to_i)
        time[0] += 12 unless time[0] == 12
        txt = sprintf("%02d:%02d", *time)
      end
      times << [stations[index], txt]
    end
  end
  trains[train_numbers[column-3]] = times
end

# SOUTHBOUND

southbound = doc/'//table[@summary="Weekday Southbound service"]'

train_numbers = southbound/'tbody/tr[1]/th/text()'
train_numbers = train_numbers.map(&:to_s).find_all{|n| n =~ /\d\d\d/}

stations = (southbound/"tbody/tr/th[2]/a").map(&:text).map{|t| t.gsub(/\302\240/,' ')}

3.upto(train_numbers.length+2) do |column|
  cell_index = column
  cell_index += 1 if column >= 27
  times = []
  cells = southbound/"tbody/tr/td[#{cell_index}]"
  cells.each_with_index do |cell, index|
    txt = cell.text.delete("\r\n\302\240 -")
    unless txt.empty?
      if (cell/"strong").length > 0
        time = txt.split(":").map(&:to_i)
        time[0] += 12 unless time[0] == 12
        txt = sprintf("%02d:%02d", *time)
      end
      times << [stations[index], txt]
    end
  end
  trains[train_numbers[column-3]] = times
end



f = File.open("trains.json", "wb")
f.write(JSON.pretty_generate(trains))
f.close()
